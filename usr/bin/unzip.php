<?php
// Unzip for Symbiose WebOS
// Coded by TiBounise (http://tibounise.com)
// Reviewed by $imon
// Released as GPL v3 software

$authManager = $this->managers()->getManagerOf('authorization');
$fileManager = $this->managers()->getManagerOf('file');
$params = $this->cmd->params();

if (count($params) == 0)
	throw new \InvalidArgumentException('No file specified');

$zipPath = $this->terminal->absoluteLocation($params[0]);

//Authorizations
$processAuths = $authManager->getByPid($this->cmd['id']);
$this->guardian->controlArgAuth('file.read', $zipPath, $processAuths);

if (!$fileManager->exists($zipPath))
	throw new \InvalidArgumentException('The file doesn\'t exist');

// Check file type
if ($fileManager->extension($zipPath) != 'zip')
	throw new \InvalidArgumentException('Specified file is not a zip file');

// Generate the real paths
$internalZipPath = $fileManager->toInternalPath($zipPath);
$zipFilename = $fileManager->basename($zipPath);
$dest = $this->terminal->dir();

//Authorizations episode 2
$this->guardian->controlArgAuth('file.write', $dest, $processAuths);

// Stores the times at the beginning of the script
$startTime = time();

//Check available space
$zip = new ZipArchive;
$result = $zip->open($internalZipPath);

echo 'Archive: '.$zipFilename."\n";

// Unzip :P
if ($result === TRUE) {
	for ($i = 0; $i < $zip->numFiles; $i++) {
		$entry = $zip->getNameIndex($i);

		if (substr($entry, -1) == '/') { // Is this entry a directory ?
			echo '&nbsp;&nbsp;&nbsp;creating: '.$entry."\n";
			$fileManager->mkdir($dest.'/'.$entry);
		} else {
			echo '&nbsp;extracting: '.$entry."\n";
			$handle = $zip->getStream($entry);
			$contents = @stream_get_contents($handle);
			if ($contents === false) {
				echo 'Error : cannot extract "'.$entry.'".'."\n";
			} else {
				$fileManager->write($dest.'/'.$entry, $contents);
			}
		}
	}

	$zip->close();

	echo $zipFilename.' has been unzipped in '.(time() - $startTime).' seconds.';
} else {
	throw new \RuntimeException('Error while opening zip file');
}