FROM nf-devstack-shell

ARG NF_DEVSTACK_USER
ARG NF_DEVSTACK_USER_UID
ARG NF_DEVSTACK_USER_GID

# Create the devstack user, allow it to sudo without password
USER root
RUN groupadd --gid ${NF_DEVSTACK_USER_GID} ${NF_DEVSTACK_USER}
RUN useradd --gid ${NF_DEVSTACK_USER_GID} --uid ${NF_DEVSTACK_USER_UID} -ms /bin/bash ${NF_DEVSTACK_USER}
RUN echo "${NF_DEVSTACK_USER} ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/01-${NF_DEVSTACK_USER}

# Default to the user's home directory
USER ${NF_DEVSTACK_USER}
WORKDIR /home/${NF_DEVSTACK_USER}
