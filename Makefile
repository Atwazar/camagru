make:
	docker-compose up -d

clean:
	docker-compose down --volumes --rmi all --remove-orphans

re: clean make