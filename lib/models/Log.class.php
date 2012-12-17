<?php
namespace lib\models;

/**
 * Log represente une entre dans un fichier de journalisation (log)
 * @author $imon
 * @version 1.0
 *
 */
abstract class Log extends \lib\WebosComponent {
	protected $log; //La ligne de log

	/**
	 * Enregistrer le log.
	 * @param string $file Le fichier de journalisation.
	 */
	protected function _save($file) {
		$line = date('M d G:i:s').' '.$_SERVER['SERVER_NAME'].' '.$this->log;

		$path = 'var/log/' . $file;
		if (is_writable($path)) {
			file_put_contents($path, $line."\n", FILE_APPEND);
		}
	}

	/**
	 * Enregistrer le log.
	 */
	abstract public function save();
}