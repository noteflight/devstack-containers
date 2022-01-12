FROM nf-devstack-shell

ARG NF_REPOS
ARG NF_DEVSTACK_DATA
ARG NF_DEVSTACK_USER_DIR
ARG NF_DEVSTACK_USER
ARG NF_DEVSTACK_USER_UID
ARG NF_DEVSTACK_USER_GID
ARG NF_DEVSTACK_TIMEZONE
ARG NF_AWS_PROFILE
ARG HOST_DOCKER_GID

USER root

# Create the devstack user, allow it to sudo without password
RUN groupadd --gid ${NF_DEVSTACK_USER_GID} ${NF_DEVSTACK_USER}
RUN useradd --gid ${NF_DEVSTACK_USER_GID} --uid ${NF_DEVSTACK_USER_UID} -ms /bin/bash ${NF_DEVSTACK_USER}
RUN echo "${NF_DEVSTACK_USER} ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/01-${NF_DEVSTACK_USER}

# To access docker on the host, the user must be added to the docker
# group.  But the docker group id on the host may be different from
# the group in the container, so we create a group with that id and
# add the user to it.
RUN groupadd -o -g ${HOST_DOCKER_GID} host-docker
RUN usermod -aG host-docker ${NF_DEVSTACK_USER}

# Set the timezone
RUN ln -snf /usr/share/zoneinfo/${TATERDEVENV_TIMEZONE} /etc/localtime
RUN echo ${NF_DEVSTACK_TIMEZONE} > /etc/timezone

ENV AWS_PROFILE=${NF_AWS_PROFILE}

# These are needed so that if nf-xxx-devapps are called from within
# the container, the required environment variables are passed through
ENV NF_REPOS=${NF_REPOS}
ENV NF_DEVSTACK_DATA=${NF_DEVSTACK_DATA}
ENV NF_DEVSTACK_USER_DIR=${NF_DEVSTACK_USER_DIR}

# Tell webpack to use the generated certs
ENV NF_WEBPACK_SERVER_KEY=/noteflightServersCert/server.key
ENV NF_WEBPACK_SERVER_CERT=/noteflightServersCert/server.crt

# Default to the user's home directory
USER ${NF_DEVSTACK_USER}
WORKDIR /home/${NF_DEVSTACK_USER}
