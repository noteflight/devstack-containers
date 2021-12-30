# Create an image from the base OS plus any packages that will
# eventually be needed by either the running production application or
# by a dev/test environment.  This should *NOT* depend on anything in
# the application source code, such as package.json or Gemfile files.
#
# After installing the base software, this will also create a
# "noteflight" user (with sudo privileges), and will create
# /noteflight, with the expectation that containers running
# this image will mount the directory containing NF repos into this
# mount point.

FROM ubuntu:20.04

# Run upgrade first to make sure apt-get is pointed correctly, then do update
RUN apt-get -y upgrade
RUN apt-get update

# Build and install ruby from downloaded source
ARG RUBY_VERSION=2.7.4
RUN apt-get install -y curl gcc make bison openssl libssl-dev zlib1g-dev
RUN mkdir -p /root/builds/ruby
WORKDIR /root/builds/ruby
RUN curl -o ruby-${RUBY_VERSION}.tar.gz https://cache.ruby-lang.org/pub/ruby/2.7/ruby-${RUBY_VERSION}.tar.gz
RUN tar xfz ruby-${RUBY_VERSION}.tar.gz
WORKDIR /root/builds/ruby/ruby-${RUBY_VERSION}
RUN ./configure
RUN make
RUN make install

# Download and install node
ARG NODE_VERSION=14.17.5
ARG NPM_VERSION=7.20
RUN mkdir -p /root/builds/node
WORKDIR /root/builds/node
RUN curl -o node-v${NODE_VERSION}-linux-x64.tar.gz https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz
RUN tar xzf node-v${NODE_VERSION}-linux-x64.tar.gz
# Installing is just copying the distribution components into /usr/local
RUN cp -r node-v${NODE_VERSION}-linux-x64/bin/* /usr/local/bin
RUN cp -r node-v${NODE_VERSION}-linux-x64/lib/* /usr/local/lib
RUN cp -r node-v${NODE_VERSION}-linux-x64/include/* /usr/local/include
RUN cp -r node-v${NODE_VERSION}-linux-x64/share/* /usr/local/share
RUN npm install npm@${NPM_VERSION} -g

# Install gulp
ARG GULP_VERSION=2.2.0
RUN npm install -g gulp@${GULP_VERSION}

# Install karma
RUN npm install -g karma-cli

# Install bundler
ARG BUNDLER_VERSION=2.2.0
RUN gem install bundler:${BUNDLER_VERSION}

# Install rails
ARG RAILS_VERSION=6.0.4.1
RUN gem install rails -v ${RAILS_VERSION}

# Install imagemagick, but first install tzdata, which is apparently
# used by imagemagick - install it separately to make sure it runs
# non-interactively (otherwise it asks for a timezone.  This way it
# defaults to UTC)
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends tzdata
RUN apt-get install -y imagemagick graphicsmagick-libmagick-dev-compat
RUN apt-get install -y libmagickwand-dev libmagickcore-dev

# Install nokogiri
RUN gem install nokogiri

# Install mysql gem
ARG MYSQL_GEM_VERSION=0.5.2
RUN apt-get install -y mysql-client libmysqlclient-dev
RUN gem install mysql2 -v ${MYSQL_GEM_VERSION}

# Install aws cli v2
# (https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
RUN apt-get install -y zip
RUN mkdir -p /root/builds/awscli
WORKDIR /root/builds/awscli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN ./aws/install

# Install useful utilities
RUN apt-get install -y telnet emacs sudo zip
RUN apt-get install -y git jq
RUN apt-get install -y iproute2 iputils-ping ssh
RUN apt-get install -y dialog apt-utils
# Used for displaying aws cli help pages
RUN apt-get install -y groff

# Prepare docker to be accessible from within the container (it will
# only be accessible if the host runs the container with -v
# /var/run/docker.sock:/var/run/docker.sock)
RUN apt-get install -y docker
RUN touch /var/run/docker.sock
RUN chmod 666 /var/run/docker.sock

# Install chrome (used to run karma tests)
RUN mkdir -p /root/builds/chrome
WORKDIR /root/builds/chrome
RUN curl -o google-chrome-stable_current_amd64.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
# This first attempt to install chrome will fail, but will mark its missing dependencies.  The "|| true" prevents it from stopping the build
RUN dpkg -i google-chrome-stable_current_amd64.deb || true
# Install the marked dependencies
RUN apt-get -f install -y
# This second attempt should succeed
RUN dpkg -i google-chrome-stable_current_amd64.deb

# Install rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
RUN chmod -R a+rx /root/.cargo/bin
ENV PATH=${PATH}:/root/.cargo/bin

# Generate a self-signed certificate, used in running SSL servers
RUN mkdir -p /root/builds/cert
WORKDIR /root/builds/cert
RUN cp /usr/lib/ssl/openssl.cnf ./ssl.cnf
RUN echo "[SAN]" >> ./ssl.cnf
RUN echo "subjectAltName=DNS:localhost,DNS:demo.noteflight.com" >> ./ssl.cnf
RUN openssl genrsa -des3 -passout pass:abcdef -out server.pass.key 2048
RUN openssl rsa -passin pass:abcdef -in server.pass.key -out server.key
RUN rm server.pass.key
RUN openssl req -newkey rsa:2048 -x509 -nodes -keyout server.key -new -out server.crt -subj /CN=localhost.ssl -reqexts SAN -extensions SAN -sha256 -days 3650 -config ./ssl.cnf
RUN chmod a+rx /root/builds/cert
RUN chmod a+r /root/builds/cert/*
ENV NF_DEV_SERVER_KEY=/root/builds/cert/server.key
ENV NF_DEV_SERVER_CERT=/root/builds/cert/server.crt

##################################################
# Configuration involving the noteflight user

# Create the noteflight user, allow it to sudo without a password.
# The user and associated group are created with a set uid and gid of
# 275001.  Files created by this container in directories mounted from
# the host will appear to be owned by that uid/gid when seen on the
# host.  The host system may wish to create a user with the same
# uid/gid so that there is a name associated with the uid/gid when
# listing those directories on the host.
ARG USERNAME=noteflight
ARG NF_UID=275001
RUN groupadd --gid ${NF_UID} ${USERNAME}
RUN useradd --gid ${NF_UID} --uid ${NF_UID} -ms /bin/bash ${USERNAME}
RUN echo "${USERNAME} ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/01-${USERNAME}
WORKDIR /home/${USERNAME}

# Prepare /noteflight, where the NF repos will be mounted
USER root
RUN mkdir /noteflight
RUN chown -R ${USERNAME}:${USERNAME} /noteflight

# Prepare the location where the AWS credentials will be mounted
USER ${USERNAME}
RUN mkdir -p /home/${USERNAME}/.aws
RUN touch /home/${USERNAME}/.aws/config

# Prepare the location where the git credentials will be mounted
USER ${USERNAME}
RUN touch /home/${USERNAME}/.gitconfig

# Prepare the location where the .ssh directory will be mounted
USER ${USERNAME}
RUN mkdir -p /home/${USERNAME}/.ssh
RUN chmod 600 /home/${USERNAME}/.ssh

# Configure bundle to install gems to a more permanent location
# (bundle normally installs gems to somewhere in /usr/local/lib, which
# is reset back to the image's original contents when the container is
# restarted).  Also update the PATH and GEM_PATH to allow executable
# gems to be run without requiring "bundle exec".
USER ${USERNAME}
ARG APPGEMS_PATH=/noteflight/webapp/site/vendor/bundle
RUN mkdir -p ${APPGEMS_PATH}
RUN chown -R ${USERNAME}:${USERNAME} ${APPGEMS_PATH}
RUN bundle config set path ${APPGEMS_PATH}
USER root
ENV PATH=${PATH}:${APPGEMS_PATH}/ruby/2.7.0/bin
ENV GEM_PATH=${GEM_PATH}:${APPGEMS_PATH}/ruby/2.7.0

# Add the nf-... utilities to the PATH
USER root
ENV PATH=${PATH}:/noteflight/webapp/devbin
ENV PATH=${PATH}:/noteflight/devops-utils/bin
ENV PATH=${PATH}:/noteflight/devstack-containers/bin

# By default, start in the user's home directory
USER ${USERNAME}
WORKDIR /home/${USERNAME}
