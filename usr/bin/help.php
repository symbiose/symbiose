<?php
$version = $this->webos->managers()->get('File')->get('/usr/share/docs/bash/version.txt')->contents();

echo 'GNU bash, version '.$version.'<br />';
echo 'Liste des commandes :<br />';

echo $this->webos->managers()->get('File')->get('/usr/share/docs/bash/cmds.html')->contents();