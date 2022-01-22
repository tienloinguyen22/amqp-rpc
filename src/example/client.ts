import * as uuid from 'uuid';
import { assertMakeRpcRequest } from '../rpc/make-rpc-request';

const availableProjects = [];

const run = async () => {
  const makeRpcRequest = await assertMakeRpcRequest({
    rabbitUrl: `amqp://localhost:5672`,
    clientName: 'amqp-rpc-client',
  });

  setInterval(async () => {
    const topics = ['projects:create', 'projects:archive'];
    const selectedTopic = availableProjects.length > 0 ? topics[Math.floor(Math.random() * topics.length)] : topics[0];
    const content = selectedTopic === topics[0] ? { title: uuid.v4() } : { projectId: availableProjects[Math.floor(Math.random() * availableProjects.length)] };
    const response = await makeRpcRequest('amqp-rpc-server', selectedTopic, content); 
    if (selectedTopic === topics[0]) {
      availableProjects.push(response._id);
    }
    console.log(selectedTopic, response);
  }, 2000);
};

run();