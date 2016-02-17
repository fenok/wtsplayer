For some reason the original peerJS server wasn't able to emit 'connection'. PeerJS server was improved a bit to emit 'clientAdded' and 'clientRemoved' events. Now it is in the 'temp' folder cuz peerJS from npm seems to work fine now =/

peer.js manually updated to the latest version with wsport support (25.12.2015)

npm install express --save
npm install timesync --save
npm install peer --save
npm install node-uuid --save
npm install ejs --save

remember that OpenShift works on 8000 port!

How-to: Erase all history from a git repository on OpenShift and start over with your current files as the Initial Commit
Started by cdaley on January 26, 2013 at 02:27 AM
Do this at your own risk. Make sure that you have a good backup first

cp -R <old locally cloned repo directory> <new directory name>
The position that I was in when I figured this out: I had my current project that I also wanted to push to github, but I had previously had sensitive information that was saved into my git repository. I wanted to remove ALL previous history of my git commits, and make the files and directories that I have right now my initial commit so that my commit history would not show up in the git log

ssh into your gear
cd git
rm -rf [appname].git # this will remove all files except for the [appname].git/hooks directory and it's files
cd [appname].git
git init --bare
exit this ssh session
cd into your locally cloned directory
rm -rf .git
git init
git remote add origin [git repo url from your control panel]
git add .
git commit -am "initial commit"
git push origin master

You should now have a clean git log & git commit history, and you can add your github repository as a remote and git push to it now.

git remote add github <url to your github repo>