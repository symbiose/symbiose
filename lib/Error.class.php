<?php
namespace lib;

/**
 * Error represente une erreur.
 * @author $imon
 * @version 1.0
 */
abstract class Error extends \lib\WebosComponent {
	/**
	 * Message d'erreur.
	 * @var string
	 */
	protected $message;
	/**
	 * Fichier ou l'erreur s'est produite.
	 * @var string
	 */
	protected $file;
	/**
	 * Ligne ou l'erreur s'est produite.
	 * @var string
	 */
	protected $line;

	/**
	 * @var array Liste des erreurs survenues lors de l'execution du script PHP.
	 */
	protected static $errors = array();

	/**
	 * @var Webos Le webos.
	 */
	protected static $errorsWebos;

	/**
	 * Declancher une erreur.
	 * @param Webos Le webos.
	 * @param string $message Le message d'erreur.
	 * @param string $file Le fichier ou l'erreur est survenue.
	 * @param string $line La ligne ou l'erreur est survenue.
	 */
	public function __construct(Webos $webos, $message, $file, $line) {
		$this->webos = $webos;
		$this->message = $message;
		$this->file = $file;
		$this->line = $line;

		$log = new \lib\models\ErrorLog($this); //On enregistre l'erreur dans un log
		$log->save();
	}

	/**
	 * Recuperer le message d'erreur.
	 * @return string Le message d'erreur.
	 */
	public function getMessage() {
		return $this->message;
	}

	/**
	 * Recuperer le fichier ou l'erreur est survenue.
	 * @return string Le fichier ou l'erreur est survenue.
	 */
	public function getFile() {
		return $this->file;
	}

	/**
	 * Recuperer la ligne ou l'erreur est survenue.
	 * @return string La ligne ou l'erreur est survenue.
	 */
	public function getLine() {
		return $this->line;
	}

	abstract public function __toString();

	/**
	 * Terminer le script.
	 */
	protected function bye() {
		if ($this->webos == null) {
			exit;
		} else {
			if ($this->webos->getHTTPResponse() instanceof ServerCallResponse) {
				$this->webos->getHTTPResponse()->isError();
			}
			$this->webos->getHTTPResponse()->send();
		}
	}

	/**
	 * Afficher l'erreur.
	 */
	public function show() {
		if ($this->webos->getHTTPResponse() instanceof ServerCallResponse) {
			$this->webos->getHTTPResponse()->addError($this->__toString());
		} else {
			echo "\n".$this->__toString();
		}
	}

	/**
	 * Declancher une erreur.
	 * @param int $severity Le niveau de l'erreur.
	 * @param string $message Le message d'erreur
	 * @param string $file Le fichier ou l'erreur est survenue.
	 * @param string $line La ligne ou l'erreur est survenue.
	 */
	public static function trigger($severity, $message, $file, $line) {
		switch($severity) {
			case E_ERROR:
			case E_USER_ERROR:
				$error = new \lib\FatalError(self::$errorsWebos, $message, $file, $line);
				break;
			case E_WARNING:
			case E_USER_WARNING:
				$error = new \lib\WarningError(self::$errorsWebos, $message, $file, $line);
				break;
			case E_NOTICE:
			case E_USER_NOTICE:
				$error = new \lib\NoticeError(self::$errorsWebos, $message, $file, $line);
				break;
			//case E_STRICT:
			//	$error = new \lib\StrictError(self::$errorsWebos, $message, $file, $line);
			//	break;
			case E_DEPRECATED:
			case E_USER_DEPRECATED:
				$error = new \lib\DeprecatedError(self::$errorsWebos, $message, $file, $line);
				break;
			case E_PARSE:
				$error = new \lib\ParseError(self::$errorsWebos, $message, $file, $line);
				break;
			default: //Erreur non supportee
				return false; //On execute le gestionnaire interne a PHP
		}

		//On affiche l'erreur
		$error->show();

		return true;
	}

	/**
	 * Declancher une erreur a partir d'une exception
	 * @param Exception $e L'excpetion.
	 */
	public static function catchException(\Exception $e) {
		$error = new \lib\ExceptionError(self::$errorsWebos, $e->getMessage(), $e->getFile(), $e->getLine());

		//On affiche l'erreur
		$error->show();
	}

	/**
	 * Definir le webos.
	 * @param Webos $webos Le webos.
	 */
	public static function setErrorsWebos(Webos $webos) {
		self::$errorsWebos = $webos;
	}
}