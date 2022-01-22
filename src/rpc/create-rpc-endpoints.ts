import * as Joi from 'joi';
import { log } from './log';
import { AssertCreateRpcEndpointsConfigs, CreateRpcEndpoints, RpcResponse } from './types';
import { bufferContent, parseContent, resolveChannel } from './utils';

export const assertCreateRpcEndpoints = async (configs: AssertCreateRpcEndpointsConfigs): Promise<CreateRpcEndpoints> => {
  const channel = await resolveChannel(configs.rabbitUrl);

  return async (endpoints) => {
    for (const endpoint of endpoints) {
      const { topic, schema, options, handler } = endpoint;
      const queueName = `${configs.serverName}:${topic}`;

      const assertedQueue = await channel.assertQueue(queueName, {
        durable: false,
        autoDelete: true,
        ...(options || {}),
      });

      await channel.consume(assertedQueue.queue, async (msg) => {
        channel.ack(msg);
        log.info(`Request ${msg.properties.correlationId} received`);

        const content = parseContent(msg.content);

        try {
          // Validate
          await Joi.compile(schema).validateAsync(content, { stripUnknown: true });

          // Call handler
          const result = await handler(content);

          // Response
          const response = {
            success: true,
            data: result || {},
          };
          channel.sendToQueue(msg.properties.replyTo, bufferContent(response), { correlationId: msg.properties.correlationId });
        } catch (error) {
          log.error({
            topic,
            content,
            error,
          }, `Consume error`);

          const response: RpcResponse = {
            success: false,
            error,
          };
          channel.sendToQueue(msg.properties.replyTo, bufferContent(response), { correlationId: msg.properties.correlationId });
        }
      });
    }
  };
};