<?php
if (!$this->arguments->isParam(0)) {
	if ($this->webos->getUser()->isConnected()) {
		$path = '~';
	} else {
		$path = '/';
	}
} else {
	$path = $this->terminal->getAbsoluteLocation($this->arguments->getParam(0));
}

$authorisations = $this->webos->getAuthorization();
$requiredAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'read');
$authorisations->control($requiredAuthorisation);

$this->terminal->changeLocation($path);