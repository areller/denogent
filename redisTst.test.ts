import { connect } from "https://denopkg.com/keroxp/deno-redis/mod.ts";
import { assertEquals } from "https://deno.land/std@0.72.0/testing/asserts.ts";
const redis = await connect({
  hostname: Deno.env.get('REDIS_HOST')!,
  port: Deno.env.get('REDIS_PORT')
});

Deno.test('redis', async () => {
    await redis.set('name', 'areller');
    assertEquals(await redis.get('name'), 'areller');
});