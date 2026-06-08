-- Adicionar constraint UNIQUE em inventory (warehouse_id, product_id)
-- Necessário para o ON CONFLICT do upsert de saldo de estoque (recebimento — unidade 5.3)
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_product_unique" UNIQUE("warehouse_id","product_id");
