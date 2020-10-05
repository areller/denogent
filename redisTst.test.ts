import { connect } from "https://denopkg.com/keroxp/deno-redis/mod.ts";
import { assertEquals } from "https://deno.land/std@0.72.0/testing/asserts.ts";
const hostname = Deno.env.get('REDIS_HOST')!;
const port = Deno.env.get('REDIS_PORT');
const redis = await connect({
  hostname: hostname,
  port: port
});

Deno.test('redis', async () => {
    console.log('Redis = ' + hostname + ':' + port);
    await redis.set('name', 'areller');
    assertEquals(await redis.get('name'), 'areller');
});