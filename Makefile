.PHONY: ai down logs

ai:
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example - add your API keys")
	@docker compose up --build -d
	@echo ""
	@echo "App running at http://localhost:3000"

down:
	@docker compose down

logs:
	@docker compose logs -f app
