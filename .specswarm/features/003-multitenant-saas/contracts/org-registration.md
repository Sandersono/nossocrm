# Contract: Organization Registration

## Endpoint

`POST /api/organizations/register`

## Request Body

```json
{
  "companyName": "Agencia Exemplo",
  "name": "Maria Silva",
  "email": "maria@agencia.com",
  "password": "Senha123"
}
```

## Success Response

```json
{
  "ok": true,
  "organization": {
    "id": "uuid",
    "name": "Agencia Exemplo"
  },
  "user": {
    "id": "uuid",
    "email": "maria@agencia.com"
  }
}
```

## Failure Modes

- `400`: payload invalido ou erro de criacao do usuario
- `403`: origem proibida
- `409`: plataforma ainda nao inicializada; usar `/setup`
- `500`: erro de banco ou RPC
