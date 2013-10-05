<?php
$terminalManager = $this->managers()->getManagerOf('terminal');
$authManager = $this->managers()->getManagerOf('authorization');
$fileManager = $this->managers()->getManagerOf('file');
$params = $this->cmd->params();

if (count($params) == 0) {
	if ($this->app()->user()->isLogged()) {
		$path = '~';
	} else {
		$path = '/';
	}
} else {
	$path = $fileManager->beautifyPath($this->terminal->absoluteLocation($params[0]));
}

//Authorizations
$processAuths = $authManager->getByPid($this->cmd['id']);
$this->guardian->controlArgAuth('file.read', $path, $processAuths);

if (!$fileManager->isDir($path)) {
	throw new \RuntimeException('"'.$path.'" : not a directory');
}

$this->terminal->setDir($path);
$terminalManager->updateTerminal($this->terminal);