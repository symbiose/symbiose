<?php
// Wget for Symbiose WebOS
// Coded by TiBounise (http://tibounise.com)
// Reviewed by $imon
// Released as GPL v3 software

$authManager = $this->managers()->getManagerOf('authorization');
$fileManager = $this->managers()->getManagerOf('file');
$params = $this->cmd->params();

if (count($params) == 0) {
	throw new \InvalidArgumentException('No URL specified');
}

$Url = $params[0];
$ParsedUrl = parse_url($Url);

if (!isset($ParsedUrl['host'])) {
	throw new \InvalidArgumentException('Invalid URL');
}

// Dirty part to generate a new name for the file
if (isset($ParsedUrl['path'])) {
	$baseFilename = end(explode('/',$ParsedUrl['path']));
} else {
	$baseFilename = 'index.html';
}

$filename = $baseFilename;
$i = 1;

while ($fileManager->exists($this->terminal->absoluteLocation($filename))) {
	$filename = $baseFilename . '.' . $i;
	$i++;
}
$filePath = $this->terminal->absoluteLocation($filename);

//Authorizations
$processAuths = $authManager->getByPid($this->cmd['id']);
$this->guardian->controlArgAuth('file.write', $filePath, $processAuths);

echo 'Connecting to '.$ParsedUrl['host'].'...';
// Check if the file exists
$handle = @fopen($Url,'rb');
if ($handle === false) {
	throw new \RuntimeException('URL unreachable');
}
echo ' connected.'."\n";

echo 'Saving as : "'.$filename.'"...'."\n";
$contents = @stream_get_contents($handle);
if ($contents === false) {
	throw new \RuntimeException('Cannot read remote file');
}

fclose($handle);

$fileManager->write($filePath, $contents);

echo date('Y-m-d H:i:s').' - "'.$filename.'" saved ['.$fileManager->size($filePath).']';