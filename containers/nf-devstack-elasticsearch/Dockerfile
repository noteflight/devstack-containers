# Creates our own ElasticSearch container for our version of ES
# (there are only a couple ES versions with official containers)

FROM ubuntu:20.04

# Run upgrade first to make sure apt-get is pointed correctly, then do update
RUN apt-get -y upgrade
RUN apt-get update

RUN apt-get install -y default-jdk
RUN apt-get install -y curl zip sudo

# Create the user, allow it to sudo without a password
ARG USERNAME=elasticsearch
RUN useradd -ms /bin/bash ${USERNAME}
RUN echo "${USERNAME} ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/01-${USERNAME}
USER ${USERNAME}
WORKDIR /home/${USERNAME}

# Download and unzip elasticsearch
ARG ELASTICSEARCH_VERSION=6.2.4
RUN curl --output elasticsearch-${ELASTICSEARCH_VERSION}.zip https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ELASTICSEARCH_VERSION}.zip
RUN unzip elasticsearch-${ELASTICSEARCH_VERSION}.zip
RUN mv elasticsearch-${ELASTICSEARCH_VERSION} elasticsearch

# Set up to listen on all interfaces (not just 127.0.0.1, the ES default)
# Doing this normally triggers the bootstrap checks, which we fail because
# vm.max_map_count is set too low, which is difficult to change (it may require
# changes on the host machine).  To avoid the bootstrap checks, we set
# discovery.type to "single-node"
RUN echo "network.host: 0.0.0.0" >> elasticsearch/config/elasticsearch.yml
RUN echo "discovery.type: single-node" >> elasticsearch/config/elasticsearch.yml

# Install the ICU Analysis plugin (helps with Unicode normalization)
USER root
WORKDIR /home/elasticsearch
RUN elasticsearch/bin/elasticsearch-plugin install analysis-icu

# Prepare the /data directory to be mounted from an external volume
USER root
WORKDIR /home/elasticsearch
RUN mkdir -p elasticsearch/data
RUN chmod a+rwx elasticsearch elasticsearch/data

USER elasticsearch
WORKDIR /home/elasticsearch
CMD ["elasticsearch/bin/elasticsearch"]

