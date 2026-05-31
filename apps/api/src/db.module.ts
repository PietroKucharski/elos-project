import { Global, Module } from '@nestjs/common'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './db/schema'

export const DRIZZLE = Symbol('DRIZZLE')

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const client = postgres(process.env.DATABASE_URL!, {
          max: 10,
          idle_timeout: 20,
          connect_timeout: 10,
        })
        return drizzle(client, {
          schema,
          logger: process.env.NODE_ENV === 'development',
        })
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
