import * as uuid from 'uuid';
import { RpcResponse } from '.';
import { RPC_REQUEST_TIMEOUT } from './constants';
import { log } from './log';
import { AssertMakeRpcRequestConfigs, MakeRpcRequest, RpcRequest } from './types';
import { bufferContent, parseContent, resolveChannel } from './utils';

const requestsMapper = new Map<string, RpcRequest>();

export const assertMakeRpcRequest = async (configs: AssertMakeRpcRequestConfigs): Promise<MakeRpcRequest> => {
  const channel = await resolveChannel(configs.rabbitUrl);
  const replyTo = `${configs.clientName}:reply`;

  const assertedQueue = await channel.assertQueue(replyTo, {
    durable: false,
    autoDelete: true,
  });
  
  await channel.consume(assertedQueue.queue, async (msg) => {
    const rpcRequest = requestsMapper.get(msg.properties.correlationId);
    if (!rpcRequest) {
      log.warn(`Request not found for correlation id: ${msg.properties.correlationId}`);
    }

    const content = parseContent(msg.content) as RpcResponse;
    if (content.error) {
      rpcRequest.reject(content.error);
    } else {
      rpcRequest.resolve(content.data);
    }

    requestsMapper.delete(msg.properties.correlationId);
    log.info(`Request ${msg.properties.correlationId} completed. Took ${performance.now() - rpcRequest.startAt}ms`)
  });

  return async (serverName, topic, content) => {
    return new Promise((resolve, reject) => {
      const startAt = performance.now();
      const correlationId = uuid.v4();
      const queueName = `${serverName}:${topic}`;
  
      try {
        channel.sendToQueue(queueName, bufferContent(content), {
          correlationId,
          replyTo,
        });
        log.info(`Request ${correlationId} sent`)

        const timeoutId = setTimeout(() => {
          requestsMapper.delete(correlationId);
          reject(new Error(`Request ${correlationId} timeout after ${RPC_REQUEST_TIMEOUT}ms`))
        }, RPC_REQUEST_TIMEOUT);

        requestsMapper.set(correlationId, {
          resolve,
          reject,
          startAt,
          timeoutId,
        });
      } catch (error) {
        log.error({
          topic,
          content,
          error,
        });
        requestsMapper.delete(correlationId);
      }
    });
  };
};