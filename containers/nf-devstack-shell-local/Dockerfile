FROM nf-devstack-shell

ARG NF_DEVSTACK_USER
ARG NF_DEVSTACK_USER_UID
ARG NF_DEVSTACK_USER_GID
ARG NF_DEVSTACK_TIMEZONE

USER root

# Create the devstack user, allow it to sudo without password
RUN groupadd --gid ${NF_DEVSTACK_USER_GID} ${NF_DEVSTACK_USER}
RUN useradd --gid ${NF_DEVSTACK_USER_GID} --uid ${NF_DEVSTACK_USER_UID} -ms /bin/bash ${NF_DEVSTACK_USER}
RUN echo "${NF_DEVSTACK_USER} ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/01-${NF_DEVSTACK_USER}

# Set the timezone
# FIXME - this doesn't actually work, thanks to a bug.  See https://stackoverflow.com/questions/8671308/non-interactive-method-for-dpkg-reconfigure-tzdata
RUN echo ${NF_DEVSTACK_TIMEZONE} > /etc/timezone
RUN dpkg-reconfigure --frontend noninteractive tzdata

# Default to the user's home directory
USER ${NF_DEVSTACK_USER}
WORKDIR /home/${NF_DEVSTACK_USER}
