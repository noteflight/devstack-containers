# devstack-containers
Dockerfiles for various dev, test, and build operations

## Installing on a new Linux machine (either VM or actual machine)

### Set up credentials

* You will need credentials for github and for AWS
  * Github
    * Github recommends using Personal access tokens.  If you don't have one yet, [generate one here](https://github.com/settings/tokens).  This doesn't have to be Noteflight-specific, it's only specific to your Noteflight account.
    * Create a `~/.netrc` file that looks like this:
      ```
      machine github.com login <github username> password <github personal access token>
      ```
      * This file allows git to automatically authenticate when using github.
        * There are multiple ways to store the access token so that it's used automatically.  The `.netrc` method is the way that I've found to be the most straightforward.  Other methods will work too.
        * As a side-effect, this will also cause the `curl` program to use this authentication info when making calls to github.  Something to be aware of.
        * The other drawback is that your token is stored in plaintext in that file.  Just make sure your drive is encrypted, and expire/update your token regularly.
  * AWS
    * You will receive an AWS "access_key_id" and "secret_access_key" from the Noteflight administrator
    * Put those into these files, as recommended by AWS:
      * `~/.aws/credentials`:
        ```
        [noteflight]
        aws_access_key_id=AK...6A
        aws_secret_access_key=6Z...0n
        ```
        * The `[noteflight]` part is the "profile name".  You can have credentials for multiple profiles in there, which would probably be the case if you have multiple AWS accounts.  You can name the profile whatever you want - I'm assuming that it's going to be `noteflight`.
      * `~/.aws/config`:
        ```
        [noteflight]
        region=us-east-1
        output=json
        ```
        * Again - same thing about the profile name.  Use the same profile name you used in the previous step.

### Set up environment variables
        
