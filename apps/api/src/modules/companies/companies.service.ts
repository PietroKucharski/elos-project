import { subject } from '@casl/ability'
import type { CreateCompanyDto, UpdateCompanyDto } from '@elos/shared'
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { companies } from '../../db/schema'

@Injectable()
export class CompaniesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  // POST /v1/companies — SUPER_ADMIN
  async create(dto: CreateCompanyDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Company')) {
      throw new ForbiddenException('Apenas SUPER_ADMIN pode criar empresas.')
    }

    const existing = await this.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.cnpj, dto.cnpj))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (existing) {
      throw new ConflictException('Já existe uma empresa com este CNPJ.')
    }

    const [company] = await this.db.insert(companies).values(dto).returning()

    return company
  }

  // GET /v1/companies — SUPER_ADMIN
  async findAll(user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Company')) {
      throw new ForbiddenException('Acesso restrito a SUPER_ADMIN.')
    }

    return this.db.select().from(companies).orderBy(desc(companies.createdAt))
  }

  // GET /v1/companies/:cnpj
  async findByCnpj(cnpj: string, user: SessionUser) {
    const company = await this.db
      .select()
      .from(companies)
      .where(eq(companies.cnpj, cnpj))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!company) throw new NotFoundException('Empresa não encontrada.')

    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', subject('Company', company))) {
      throw new ForbiddenException('Sem permissão para acessar esta empresa.')
    }

    return company
  }

  // PATCH /v1/companies/:cnpj
  async update(cnpj: string, dto: UpdateCompanyDto, user: SessionUser) {
    const company = await this.db
      .select()
      .from(companies)
      .where(eq(companies.cnpj, cnpj))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!company) throw new NotFoundException('Empresa não encontrada.')

    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', subject('Company', company))) {
      throw new ForbiddenException('Sem permissão para atualizar esta empresa.')
    }

    const [updated] = await this.db
      .update(companies)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(companies.id, company.id))
      .returning()

    return updated
  }
}
