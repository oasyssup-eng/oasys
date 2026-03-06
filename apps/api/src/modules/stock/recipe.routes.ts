import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireRole } from '../../lib/auth';
import { setRecipeSchema, productIdParamSchema } from './stock.schemas';
import * as recipeService from './recipe.service';

interface ProductIdParams {
  Params: { productId: string };
}

export async function recipeRoutes(app: FastifyInstance) {
  // GET /stock/recipes — List products with recipes
  app.get(
    '/',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { unitId } = request.user;
      const result = await recipeService.listProductsWithRecipes(app.prisma, unitId);
      return reply.send(result);
    },
  );

  // GET /stock/recipes/missing — List products without recipes
  app.get(
    '/missing',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { unitId } = request.user;
      const result = await recipeService.listProductsWithoutRecipes(app.prisma, unitId);
      return reply.send(result);
    },
  );

  // GET /stock/recipes/:productId — Get recipe for a product
  app.get<ProductIdParams>(
    '/:productId',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const result = await recipeService.getRecipe(app.prisma, productId);
      return reply.send(result);
    },
  );

  // PUT /stock/recipes/:productId — Set recipe for a product
  app.put<ProductIdParams>(
    '/:productId',
    { preHandler: requireRole(['MANAGER', 'OWNER']) },
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const body = setRecipeSchema.parse(request.body);
      const { unitId } = request.user;
      const result = await recipeService.setRecipe(app.prisma, productId, unitId, body);
      return reply.send(result);
    },
  );
}
