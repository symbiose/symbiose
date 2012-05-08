<?php
if (!$this->arguments->isParam(0)) {
	throw new InvalidArgumentException('Aucun fichier specifi&eacute;');
}

$path = $this->terminal->getAbsoluteLocation($this->arguments->getParam(0));

$authorisations = $this->webos->getAuthorization();
$requiredAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'read');
$authorisations->control($requiredAuthorisation);

$content = $this->webos->managers()->get('File')->get($path)->contents();

if ($this->arguments->isOption('n')) {
	$lines = explode("\n", $content);

	$i = 1;
	$content = null;
	foreach($lines as $line) {
		$content .= $i.' '.$line."\n";
		$i++;
	}
}

echo nl2br(htmlspecialchars($content));