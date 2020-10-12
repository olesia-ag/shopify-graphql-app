require('isomorphic-fetch');
const dotenv = require('dotenv');
const Koa = require('koa');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const session = require('koa-session');

dotenv.config();
const { default: graphQLProxy } = require('@shopify/koa-shopify-graphql-proxy');
const { ApiVersion } = require('@shopify/koa-shopify-graphql-proxy');


const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY } = process.env;

console.log(typeof(SHOPIFY_API_KEY))

app.prepare().then(() => {
	const server = new Koa();
	server.use(session({ secure: true, sameSite: 'none' }, server));
	server.keys = [SHOPIFY_API_SECRET_KEY];
  console.log(typeof(server.keys))
	server.use(
		createShopifyAuth({
			apiKey: SHOPIFY_API_KEY,
			secret: SHOPIFY_API_SECRET_KEY,
      scopes: ['read_products', 'write_products']
			afterAuth(ctx) {
        const { shop, accessToken } = ctx.session;
        ctx.cookies.set('shopOrigin', shop, {
          httpOnly: false,
          secure: true,
          sameSite: 'none'
        });
				ctx.redirect('/');
			},
		})
	);

  //Each stable version is supported for a minimum of 12 months. This means that there are at least 9 months of overlap between two consecutive stable versions. When a new stable version is introduced and contains changes that affect your app, you have 9 months to test and migrate your app to the new version before support for the previous version is removed.
  server.use(graphQLProxy({version: ApiVersion.October19}))
	server.use(verifyRequest());
	server.use(async (ctx) => {
		await handle(ctx.req, ctx.res);
		ctx.respond = false;
		ctx.res.statusCode = 200;
		return;
  });
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
