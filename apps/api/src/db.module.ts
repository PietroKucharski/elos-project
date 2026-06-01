import { Global, Module } from '@nestjs/common'
import { db } from './db'

export const DRIZZLE = Symbol('DRIZZLE')
export type { DrizzleDB } from './db'

@Global()
@Module({
  providers: [{ provide: DRIZZLE, useValue: db }],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
