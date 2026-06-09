-- Número fiscal da NF é externo (atribuído pelo fornecedor) — único por empresa.
-- Necessário para o registro de notas fiscais (unidade 6.2).
CREATE UNIQUE INDEX "invoices_company_id_number_unique" ON "invoices" USING btree ("company_id","number");
