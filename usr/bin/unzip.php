<?php
// Unzip for Symbiose WebOS
// Coded by TiBounise (http://tibounise.com)
// Released as GPL v3 software

if (!$this->arguments->isParam(0))
	throw new InvalidArgumentException('Aucun fichier fourni');

$FileManager = $this->webos->managers()->get('File');
$AbsoluteLocation = $this->terminal->getAbsoluteLocation($this->arguments->getParam(0));

if (!$FileManager->exists($AbsoluteLocation))
	throw new InvalidArgumentException('Le fichier n\'existe pas !');

$file = $FileManager->get($AbsoluteLocation);

// Check file type
if ($file->extension() != 'zip')
	throw new InvalidArgumentException('Le fichier fourni ne semble pas être au format .zip');

// Generate the real paths
$FilePath = $file->realpath();
$ZipFilename = $file->basename();
$dest = $file->dirname();

if (!$FileManager->exists($dest)) {
	$FolderPath = $FileManager->createDir($dest)->realpath();
} else {
	$FolderPath = $FileManager->get($dest)->realpath();
}

// Stores the times at the beginning of the script
$startTime = time();

//Check available space
$zip = new ZipArchive;
$result = $zip->open($FilePath);

echo 'Archive: '.$file->basename()."\n";

// Unzip :P
if ($result === TRUE) {
	for ($i = 0; $i < $zip->numFiles; $i++) {
		$entry = $zip->getNameIndex($i);

		if (substr($entry, -1) == '/') { // Is this entry a directory ?
			echo '&nbsp;&nbsp;&nbsp;creating: '.$entry."\n";
			$FileManager->createDir($dest.'/'.$entry);
		} else {
			echo '&nbsp;extracting: '.$entry."\n";
			$handle = $zip->getStream($entry);
			$file = $FileManager->createFile($dest.'/'.$entry);
			$contents = @stream_get_contents($handle);
			if ($contents === false) {
				echo 'Erreur : impossible d\'extraire « '.$entry.' ».'."\n";
			}
			$file->setContents($contents);
		}
	}

	$zip->close();

	echo $ZipFilename.' a été décompressé en '.(time() - $startTime).' secondes.';
} else {
	throw new InvalidArgumentException('L\'archive n\'a pu etre extraite');
}