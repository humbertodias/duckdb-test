#!/bin/sh
# inicia o Redis em background
redis-server --daemonize yes

# popula dados iniciais
sleep 3
redis-cli SET lead:1 '{"external_lead_id": "lead_1", "status": "new"}'
redis-cli SET lead:2 '{"external_lead_id": "lead_2", "status": "contacted"}'
redis-cli SET lead:3 '{"external_lead_id": "lead_3", "status": "converted"}'
tail -f /dev/null
# mantém o container rodando
# redis-server
