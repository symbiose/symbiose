<?php
if (!$this->arguments->isParam(0)) {
	throw new InvalidArgumentException('Aucun fichier source specifi&eacute;');
}
if (!$this->arguments->isParam(1)) {
	throw new InvalidArgumentException('Aucun fichier de destination specifi&eacute;');
}

$source = $this->terminal->getAbsoluteLocation($this->arguments->getParam(0));
$dest = $this->terminal->getAbsoluteLocation($this->arguments->getParam(1));

$authorisations = $this->webos->getAuthorization();
$requiredAuthorisation = $authorisations->getArgumentAuthorizations($source, 'file', 'read');
$authorisations->control($requiredAuthorisation);
$requiredAuthorisation = $authorisations->getArgumentAuthorizations($dest, 'file', 'write');
$authorisations->control($requiredAuthorisation);

$this->webos->managers()->get('File')->get($source)->copy($dest);