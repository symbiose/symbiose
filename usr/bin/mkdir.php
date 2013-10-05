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
$this->guardian->controlArgAuth('file.write', $path, $processAuths);

$recursive = (in_array('p', $optionsNames));

$fileManager->mkdir($path, $recursive);