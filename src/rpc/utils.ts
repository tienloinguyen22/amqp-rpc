import { Channel, connect } from 'amqplib';

const channels = new Map<string, Channel>();

export const resolveChannel = async (rabbitUrl: string): Promise<Channel> => {
  if (channels.get(rabbitUrl)) {
    return channels.get(rabbitUrl);
  }

  const connection = await connect(rabbitUrl);
  const channel = await connection.createChannel();
  channels.set(rabbitUrl, channel);
  return channel;
};

export const bufferContent = (msg: any): Buffer => {
  return Buffer.from(JSON.stringify(msg));
};

export const parseContent = (content: Buffer): any => {
  return JSON.parse(content.toString());
};