import * as Joi from 'joi';
import { Options } from 'amqplib';

export type AssertCreateRpcEndpointsConfigs = {
  rabbitUrl: string;
  serverName: string;
}

export type RpcEndpointConfigs = {
  topic: string;
  schema?: Joi.SchemaLike;
  options?: Options.AssertQueue,
  handler: (payload: any) => Promise<any>;
}

export type CreateRpcEndpoints = (endpoints: RpcEndpointConfigs[]) => Promise<void>;

export type RpcResponse = {
  success: boolean;
  data?: any;
  error?: Error;
};

export type AssertMakeRpcRequestConfigs = {
  rabbitUrl: string;
  clientName: string;
}

export type MakeRpcRequest = (serverName: string, topic: string, content: any) => Promise<any>;

export type RpcRequest = {
  resolve: (value: any) => void;
  reject: (error: Error | null) => void;
  startAt: number; // Timestamp in ms;
  timeoutId: NodeJS.Timeout;
};