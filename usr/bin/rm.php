<?php
if (!$this->arguments->isParam(0)) {
	throw new InvalidArgumentException('Aucun fichier specifi&eacute;');
}

$path = $this->terminal->getAbsoluteLocation($this->arguments->getParam(0));

$authorisations = $this->webos->getAuthorization();
$requiredAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'write');
$authorisations->control($requiredAuthorisation);

$this->webos->managers()->get('File')->get($path)->delete();