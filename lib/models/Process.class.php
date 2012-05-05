<?php
namespace lib\models;

//Si l'espace de stockage des processus n'est pas definit
if (!isset ($_SESSION['processes']))
	$_SESSION['processes'] = array();

/**
 * Process represente un processus.
 * @author $imon
 * @version 1.0
 */
abstract class Process extends \lib\WebosComponent {
	protected $auth;
	protected $pid;
	protected $key;
	protected $childs;
	protected $startTime;

	/**
	 * Demarre le processus.
	 * @param Webos $webos Le webos.
	 * @param Authorization $auth Le niveau d'autorisation du processus.
	 */
	public function __construct(\lib\Webos $webos, \lib\Authorization $auth) {
		//On appelle le constructeur du parent.
		parent::__construct($webos);

		$this->auth = $auth; //On stocke l'autorisation
		$this->pid = $this->_getNextId(); //On determinse l'ID du processus
		$uniqueId = new \lib\UniqueId();
		$this->key = $uniqueId->getId(); //On determine la clef du processus
		$this->childs = array();
		$this->startTime = microtime(); //Date de demarrage

		$this->_register(); //On ajoute le processus a la liste
	}

	/**
	 * Demarrer le processus.
	 */
	abstract public function run();

	/**
	 * Recuperer l'autorisation associee au processus.
	 * @return Authorization L'autorisation.
	 */
	public function getAuthorization() {
		return $this->auth;
	}

	/**
	 * Recuperer l'ID du processus (PID).
	 * @return int Le PID du processus.
	 */
	public function getId() {
		return $this->pid;
	}

	/**
	 * Recuperer la clef secrete du processus.
	 * @return string La clef secrete du processus.
	 */
	public function getKey() {
		return $this->key;
	}

	/**
	 * Stopper le processus.
	 */
	public function stop() {
		if (!$this->webos->managers()->get('Process')->exists($this->pid))
			return false;
		else
			unset($_SESSION['processes'][$this->pid]);
	}

	/**
	* Ajouter un processus enfant.
	* @param Process $proc Le processus a ajouter.
	*/
	public function addChildProcess(Process $proc) {
		$this->childs[] = $proc->getId();
	}

	public function runChildProcess() {

	}

	/**
	 * Determiner si le processus a des processus enfants.
	 */
	public function hasChildProcess() {
		$manager = $this->webos->managers()->get('Process');
		foreach ($this->childs as $no => $pid) {
			if (!$manager->exists($pid))
				unset($this->childs[$no]);
			else
				return true;
		}
		return false;
	}

	/**
	 * Ajouter le processus a la liste.
	 */
	protected function _register() {
		$_SESSION['processes'][$this->getId()] = serialize($this);
	}

	/**
	 * Determiner le PID du prochain processus.
	 * @return int Le PID.
	 */
	protected function _getNextId() {
		$pids = array_keys($_SESSION['processes']);
		return end($pids) + 1;
	}
}