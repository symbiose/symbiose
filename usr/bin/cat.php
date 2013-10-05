<?php
$authManager = $this->managers()->getManagerOf('authorization');
$fileManager = $this->managers()->getManagerOf('file');
$params = $this->cmd->params();
$optionsNames = array_keys($this->cmd->options());

if (count($params) == 0) {
	throw new \InvalidArgumentException('No file specified');
}

$path = $this->terminal->absoluteLocation($params[0]);

//Authorizations
$processAuths = $authManager->getByPid($this->cmd['id']);
$this->guardian->controlArgAuth('file.read', $path, $processAuths);

$content = $fileManager->read($path);

if (in_array('n', $optionsNames)) {
	$lines = explode("\n", $content);

	$i = 1;
	$content = null;
	foreach($lines as $line) {
		$content .= $i.' '.$line."\n";
		$i++;
	}
}

echo htmlspecialchars($content);