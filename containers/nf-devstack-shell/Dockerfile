# Create an image from the base OS plus any packages that will
# eventually be needed by either the running production application or
# by a dev/test environment.  This should *NOT* depend on anything in
# the application source code, such as package.json or Gemfile files.
#
# This assumes that the noteflight source repos will eventually be
# mounted at /noteflight.

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
RUN apt-get install -y telnet emacs sudo zip wget nano
RUN apt-get install -y git jq
RUN apt-get install -y iproute2 iputils-ping ssh bind9-utils
RUN apt-get install -y dialog apt-utils
# Used for displaying aws cli help pages
RUN apt-get install -y groff

# Install chrome (used to run karma tests)
RUN mkdir -p /root/builds/chrome
WORKDIR /root/builds/chrome
RUN curl -o google-chrome-stable_current_amd64.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
# This first attempt to install chrome will fail, but will mark its missing dependencies.  The "|| true" prevents it from stopping the build
RUN echo "*** Ignore complaints about missing installation components.  They will be installed in a couple steps"
RUN dpkg -i google-chrome-stable_current_amd64.deb || true
# Install the marked dependencies
RUN apt-get -f install -y
# This second attempt should succeed
RUN dpkg -i google-chrome-stable_current_amd64.deb

# Install docker (instructions from https://docs.docker.com/engine/install/ubuntu/)
RUN apt-get install -y ca-certificates curl gnupg lsb-release
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN apt-get update
RUN apt-get install -y docker-ce docker-ce-cli containerd.io

# The container will run with /var/run/docker.sock mapped to the host
# so we can run docker within the container.  We need the proper
# permissions on it for that to work.
RUN touch /var/run/docker.sock
RUN chmod a+rw /var/run/docker.sock

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
RUN cp -r /root/builds/cert /noteflightServersCert
RUN chmod a+rx /noteflightServersCert
RUN chmod a+r /noteflightServersCert/*
ENV NF_DEV_SERVER_KEY=/noteflightServersCert/server.key
ENV NF_DEV_SERVER_CERT=/noteflightServersCert/server.crt

# Configure bundle to install gems to a more permanent location.
# Bundle normally installs gems to somewhere in /usr/local/lib, which
# is reset back to the image's original contents when the container is
# restarted, so we instead set it to be within the /noteflight repo
# (into a .gitignore'd location).  Update the PATH and GEM_PATH to
# allow executable gems to be run without requiring "bundle exec".
ARG APPGEMS_PATH=/noteflight/webapp/site/vendor/bundle
ENV BUNDLE_PATH=${APPGEMS_PATH}
ENV PATH=${PATH}:${APPGEMS_PATH}/ruby/2.7.0/bin
ENV GEM_PATH=${GEM_PATH}:${APPGEMS_PATH}/ruby/2.7.0

# Add the nf-... utilities to the PATH
ENV PATH=${PATH}:/noteflight/webapp/devbin
ENV PATH=${PATH}:/noteflight/devops-utils/bin
ENV PATH=${PATH}:/noteflight/devstack-containers/bin

# By default start in /noteflight
WORKDIR /noteflight
