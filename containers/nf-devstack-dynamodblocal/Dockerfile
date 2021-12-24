# Same as amazon's offical dynamodb-local image, except that it saves
# its data persistently by default.  Users of the image should mount a
# host directory (or docker volume) at "/home/dynamodblocal/data".

FROM amazon/dynamodb-local

RUN mkdir -p /home/dynamodblocal/data
RUN chmod -R a+rwx /home/dynamodblocal/data
CMD ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-dbPath", "/home/dynamodblocal/data/"]
