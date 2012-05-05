<?php
$version = $this->webos->managers()->get('File')->readFile('/usr/share/docs/bash/version.txt');

echo 'GNU bash, version '.$version.'<br />';
echo 'Liste des commandes :<br />';

echo $this->webos->managers()->get('File')->readFile('/usr/share/docs/bash/cmds.html');