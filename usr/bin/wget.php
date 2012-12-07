<?php
// Wget for Symbiose WebOS
// Coded by TiBounise (http://tibounise.com)
// Released as GPL v3 software

if (!$this->arguments->isParam(0))
  throw new InvalidArgumentException('Aucune URL spécifiée');

$ParsedUrl = parse_url($this->arguments->getParam(0));
$Url = $this->arguments->getParam(0);
$FileManager = $this->webos->managers()->get('File');

if (!isset($ParsedUrl['host'])) {
  throw new InvalidArgumentException('URL invalide');
}

// Dirty part to generate a new name for the file
if (isset($ParsedUrl['path'])) {
  $baseFilename = end(explode('/',$ParsedUrl['path']));
} else {
  $baseFilename = 'index.html';
}

$filename = $baseFilename;
$i = 1;

while ($FileManager->exists($this->terminal->getAbsoluteLocation($filename))) {
  $filename = $baseFilename . '.' . $i;
  $i++;
}

echo 'Connexion vers '.$ParsedUrl['host'].'...';
// Check if the file exists
$handle = @fopen($Url,'rb');
if ($handle === false) {
	throw new InvalidArgumentException('URL inaccessible');
}
echo ' connecté.'."\n";

echo 'Sauvegarde en : « '.$filename.' »...'."\n";
$contents = @stream_get_contents($handle);
if ($contents === false) {
	throw new InvalidArgumentException('Impossible de lire le fichier');
}

fclose($handle);

$file = $FileManager->createFile($this->terminal->getAbsoluteLocation($filename));
$file->setContents($contents);

echo date('Y-m-d H:i:s').' - « '.$filename.' » sauvegardé ['.$file->size().']';