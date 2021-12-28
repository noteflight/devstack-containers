# Create an image from the base OS plus any packages that will
# eventually be needed by either the running production application or
# by a dev/test environment.  This should *NOT* depend on anything in
# the application source code, such as package.json or Gemfile files.
#
# After installing the base software, this will also create a
# "noteflight" user (with sudo privileges), and will create
# /home/noteflight/webapp/, with the expectation that containers
# running this image will mount the NF webapp repo from the host into
# this mount point.

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
# Installing is as simple as copying the distribution components into /usr/local
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

# Install useful utilities
RUN apt-get install -y telnet emacs sudo zip
RUN apt-get install -y git

# Create the noteflight user, allow it to sudo without a password
ARG USERNAME=noteflight
RUN useradd -ms /bin/bash ${USERNAME}
RUN echo "${USERNAME} ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/01-${USERNAME}
USER ${USERNAME}
WORKDIR /home/${USERNAME}

# Prepare ~/webapp, where the NF repo will be mounted
USER root
WORKDIR /home/${USERNAME}
RUN mkdir webapp
RUN chown -R ${USERNAME}:${USERNAME} webapp

# Configure bundle to install gems to a more permanent location
# (bundle normally installs gems to somewhere in /usr/local/lib, which
# is reset back to the image's original contents when the container is
# restarted).  Also update the PATH and GEM_PATH to allow executable
# gems to be run without requiring "bundle exec".
USER ${USERNAME}
ARG APPGEMS_PATH=/home/${USERNAME}/webapp/site/vendor/bundle
RUN mkdir -p ${APPGEMS_PATH}
RUN chown -R ${USERNAME}:${USERNAME} ${APPGEMS_PATH}
RUN bundle config set path ${APPGEMS_PATH}
RUN echo "export PATH=\"\$PATH:${APPGEMS_PATH}/ruby/2.7.0/bin\"" >> ~/.bash_aliases
RUN echo "export GEM_PATH=\"\$GEM_PATH:${APPGEMS_PATH}/ruby/2.7.0\"" >> ~/.bash_aliases

# Add the nf-... utilities to the PATH
USER ${USERNAME}
RUN echo "export PATH=\"\$PATH:\$HOME/webapp/dockerfiles\"" >> ~/.bash_aliases

USER ${USERNAME}
WORKDIR /home/${USERNAME}
