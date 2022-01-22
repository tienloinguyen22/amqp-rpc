import * as Joi from 'joi';
import * as uuid from 'uuid';
import { assertCreateRpcEndpoints } from '../rpc/create-rpc-endpoints';

const projects = new Map<string, { _id: string; title: string; isArchived: boolean }>();

const run = async () => {
  const createRpcEndpoints = await assertCreateRpcEndpoints({
    rabbitUrl: `amqp://localhost:5672`,
    serverName: `amqp-rpc-server`,
  });

  await createRpcEndpoints([
    {
      topic: 'projects:create',
      schema: Joi.object({
        title: Joi.string().required(),
      }),
      handler: async (payload) => {
        console.log('projects:create', payload);

        const project = {
          _id: uuid.v4(),
          title: payload.title,
          isArchived: false,
        };
        projects.set(project._id, project);

        return project;
      },
    },
    {
      topic: 'projects:archive',
      schema: Joi.object({
        projectId: Joi.string().required(),
      }),
      handler: async (payload) => {
        console.log('projects:archive', payload);
        
        const project = projects.get(payload.projectId);
        if (!project) {
          throw new Error(`Project ${payload.projectId} not found`);
        }

        const archivedProject = {
          ...project,
          isArchived: true,
        };
        projects.set(project._id, archivedProject);

        return archivedProject;
      },
    },
  ]);
};

run();