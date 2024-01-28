update-package-lock:
	@./run.sh ./npm.sh install

format:
	@./run.sh ./npm.sh run format

lint: format
	@./run.sh ./npm.sh run lint

test:
	@./run.sh ./npm.sh run test:unit

run:
	@./run.sh ./npm.sh run dev

run_docker:
	@./run.sh ./npm.sh run dev:docker
