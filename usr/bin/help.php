<?php
$fileManager = $this->managers()->getManagerOf('file');

$version = $fileManager->read('/usr/share/docs/bash/version.txt');

echo 'GNU bash, version '.$version.'<br />';
echo 'Liste des commandes :<br />';

echo $fileManager->read('/usr/share/docs/bash/cmds.html');