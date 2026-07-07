# Entities

Dominios del negocio:

- product
- category
- order
- user
- payment
- recharge
- cart

Cada entidad puede tener:

- `api`: servicios que hablan con backend.
- `model`: interfaces y tipos.
- `mappers`: conversion entre DTO del API y modelo del frontend.
- `index.ts`: API publica del dominio.
