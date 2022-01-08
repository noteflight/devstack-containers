# devstack-containers
Dockerfiles for various dev, test, and build operations

## Installing on a new Linux machine (either VM or actual machine)

### Set up credentials

* You will need credentials for github and for AWS
  * Github
    * Github recommends using Personal access tokens.  If you don't have one yet, [generate one here](https://github.com/settings/tokens).  This doesn't have to be Noteflight-specific, it's only specific to your Noteflight account.
    * Create (or add to) a `~/.netrc` file that looks like this:
      ```
      machine github.com login <github username> password <github personal access token>
      ```
      * This file allows git to automatically authenticate when using github.
        * There are multiple ways to store the access token so that it's used automatically.  The `.netrc` method is the way that I've found to be the most straightforward.  This method is assumed by the rest of the "devstack" system.
        * As a side-effect, this will also cause the `curl` program to use this authentication info when making calls to github.  Something to be aware of.
        * The other drawback is that your token is stored in plaintext in that file.  Just make sure your drive is encrypted, and expire/update your token regularly.
  * AWS
    * You will receive an AWS "access_key_id" and "secret_access_key" from the Noteflight administrator
    * Put those into these files, as recommended by AWS:
      * `~/.aws/credentials`:
        ```
        [noteflight]
        aws_access_key_id=<access key id>
        aws_secret_access_key=<secret access key>
        ```
        * The `[noteflight]` part is the "profile name".  You can have credentials for multiple profiles in there, which would probably be the case if you have multiple AWS accounts.  You can name the profile whatever you want - I'm assuming that it's going to be `noteflight`.
      * `~/.aws/config`:
        ```
        [profile noteflight]
        region=us-east-1
        output=json
        ```
        * Again - same thing about the profile name, except this time it must be prefixed by `profile` (I don't know why).  Use the same profile name you used in the previous step.

### Get the Noteflight repos

* Choose a directory to hold your Noteflight repos.  For example, `~/noteflight`
* Pull down the essential set of repos:
  ```
  cd ~/noteflight
  git clone https://github.com/noteflight/devstack-containers
  git clone https://github.com/noteflight/webapp
  git clone https://github.com/noteflight/devops-utils
  git clone https://github.com/noteflight/docs
  ```

### Set up environment variables
        
* You'll need the following variables in your environment.  You may want to add them to your `~/.bashrc` or `~/.bash_aliases` environment (or whatever file is appropriate to the shell you're using).
  * NF_REPOS - the location of your downloaded repos (`~/noteflight` for example)
  * NF_DEVSTACK_DATA - where you want to keep the data generated by the various services used in Noteflight development (mysql, elasticsearch, etc.).  For example, (`~/noteflight/devstack-data`)
  * NF_DEVSTACK_USER - the linux username that will be doing Noteflight development
  * NF_DEVSTACK_USER_DIR - the home directory of the user doing Noteflight development, e.g. `/home/arista`
  * NF_AWS_PROFILE - the name of the profile that you used in the `.aws` files above (e.g., `noteflight`)
  * NF_DEV_WEBSERVER_HOST - the hostname that you'll be using to access the Noteflight development web server.  If your browser and Noteflight server are running on the same machine, then this would just be `localhost`.  But if your linux machine is in a VM and the browser is running on the host, then this should be the IP address or hostname that you'll be using to get to the server on the VM (e.g., `192.168.56.101`).

### Set up your path

* Add the following to your path, again modifying your shell-specific files to do this:
  ```
  export PATH="${PATH}:${NF_REPOS}/devstack-containers/bin"
  ```

### Pull down the Docker images

* Run this command:
  ```
  nf-pull-devstack-images
  ```
  * This will pull down a set of images which will be tagged locally as follows (you can see them by running `docker image ls`):
    * `nf-devstack-dynamodblocal` - the local version of AWS' dynamodb, which we run in development
    * `nf-devstack-elasticsearch` - the local version of elasticsearch, which we run in development
    * `nf-devstack-mysql` - the version of mysql that we run
    * `nf-devstack-shell` - the image with all our third-party dev software pre-installed (node, ruby, rails, etc.)
    * `docker/compose` - the docker compose package, used internally by devstack
    * `amazon/aws-cli` - the AWS cli package, used internally by devstack
  * This will also build `nf-devstack-shell-local`, an image derived from `nf-devstack-shell` but with local additions, such as an account built for your `NF_DEVSTACK_USER`
  * If changes are made to our software stack, such as an update to our node or ruby version, then whoever made the changes should have published a new container (directions below) and notified all developers.  At that point, all developers just need to run `nf-pull-devstack-images` again and restart their development environment.

### Get Noteflight Running

* Initialize your Noteflight environment
  * Create the directory that will hold the data for the devstack services (mysql, elasticsearch, etc.):
    ```
    nf-create-devstack-data
    ```
    * This will prepare a set of directories in the directory you specified for `NF_DEVSTACK_DATA`
    * There are some other commands you can run.
      * `nf-delete-devstack-data` - remove the data directory, so you can create it again and start from a "fresh" dataset.  This should only be done when the devstack is stopped (see below).
      * `nf-backup-devstack-data` - stops the devstack then creates a timestamped tar file of the devstack data.  This lets you take a "snapshot" of your dev's data environment, which you can later restore.
      * `nf-restore-devstack-data {tar file}` - restores the devstack data from a previous backup
  * Start the "devstack" with this command:
    ```
    nf-start-devstack
    ```
    * This will start the various services running that are needed for noteflight development
    * There are some other commands you can run:
      * `nf-stop-devstack` - brings down the devstack services
      * `nf-show-devstack` - show the processes running in each devstack container
      * `nf-log-devstack` - show combined logs from all the devstack containers.  Do `nf-log-devstack -f` to get a tailing log
    * Once you've started the devstack, you can look in the `NF_DEVSTACK_DATA` directory to prove to yourself that files are being written there.
  * Enter the devstack shell
    * Run this command:
      ```
      nfsh
      ```
    * This will put you in a shell inside the `nf-devstack-shell` container.  Within this container:
      * The third party libraries needed for development are installed and in the path.  For example, type `node -v` or `ruby -v`.  Some gems are not yet installed (that happens in the next step).
        * To see the script that installed it all, look at `containers/devstack-shell/Dockerfile`
        * Instructions for updating or adding more are described later
      * Your `NF_REPOS` directory is mounted at `/noteflight`
      * Your username is what you specified in `NF_DEVSTACK_USER`
      * Several of your files from `NF_DEVSTACK_USER_DIR` are mounted into the container's home directory: `.ssh`, `.aws`, `.gitconfig`, `.netrc`.
      * All filesystem changes are ephemeral (they will disappear when the devstack is restarted), EXCEPT changes to the above mounted files.  If you want to install more things, see the instructions later.
    * Stay in the devstack shell for the remaining steps
  * Get the rails master key
    ```
    nf-get-rails-master-key
    ```
    * The master key is used to decrypt the secrets that we store in `/noteflight/webapp/site/config/credentials.yml.enc`.  This script pulls its value out of our running production container on ElasticBeanstalk and puts it in `/noteflight/webapp/site/config/master.key`.  Check that file to make sure it looks right (a 32-digit hex value).
  * Install the app-specific third-party libraries
    ```
    nf-update-applibs
    ```
    * We have multiple node projects and the rails app.  These each need their libraries and gems to be installed.  That's what this script does.
    * It's a good idea to re-run this script after pulling in changes from git, just in case other developers have modified a `package.json` or `Gemfile`
    * Node libraries are installed into their respective `node_modules` directories, as usual.  Since this all happens under the mounted `/noteflight`, those installations will show up in your `NF_REPOS` directory as expected.
    * Installed gems show up in your `NF_REPOS` under `webapp/site/vendor/bundle`.  This is not typical - normally the gems would be installed in a more global location.  But because `/noteflight` is the only non-ephemeral part of the container, the gems are installed there.  This was configured by a `bundle config` call executed as part of the Dockerfile.
  * Initialize and seed the web app database
    ```
    nf-initialize-webapp-data
    ```
    * This sets up the database with the standard Noteflight seed data
    * Note that this command can take a while to run
    * This command does not load the content libraries.  You should run `nf-initialize-webapp-data-full` if you want that.  Be warned that that command takes a very long time to run.
    * It might be a good idea to take a snapshot of your devstack data at this point, so that you can easily return to this starting point (especially if you ran `nf-initialize-webapp-data-full`).  Use the `nf-backup-devstack-data` instructions above.  If you do, it will stop the devstack, which will kick you out of any devstack shells you're running.  You can restart the devstack (`nf-start-devstack`) and re-enter those shells (`nfsh`).
  * Start the dev apps and servers
    ```
    nf-start-devapps
    ```
    * This will start several servers and services:
      * The rails server
      * The client webpack
      * The "gulp" process that brings the editor code into the client
      * The webpack process that brings speedyg code into the client
    * Be patient - it may take a while for these services to come up.  Use `nf-log-devapps` below to get an idea of what's going on
    * Once the services are started, you can access them at `NF_DEV_WEBSERVER_HOST` (which you set before as either "localhost" or the address of your VM):
      * `https://${NF_DEV_WEBSERVER_HOST}:8080/` - you may be warned about the untrusted certificate.  Get past that, and you should see "Noteflight Notation Dev Sandbox"
      * `https://${NF_DEV_WEBSERVER_HOST}:3000/` - you might see a similar warning.  Get past that, and you should see the noteflight site
    * As with `nf-start-devstack`, there are a few other useful commands you can run:
      * `nf-stop-devapps` - brings down the devstack apps
      * `nf-show-devapps` - show the processes running in each devapp container
      * `nf-log-devapps` - show combined logs from all the devapp containers.  Do `nf-log-devapps -f` to get a tailing log.  It's highly recommended that you keep this running in some window somewhere, so you can see any relevant activity.

## Container Development

How to add to the containers

FIXME - describe this
