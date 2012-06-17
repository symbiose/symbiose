<?php
namespace lib\models;

/**
 * Represente une commande.
 * @author $imon
 * @version 1.0
 *
 */
class Cmd extends FileProcess {
	/**
	 * La commande brute.
	 * @var string
	 */
	protected $cmdText;
	/**
	 * La commande, sans les arguments.
	 * @var string
	 */
	protected $cmd;
	/**
	 * Les arguments de la commande.
	 * @var CmdArguments
	 */
	protected $arguments;

	/**
	 * Les dossiers ou chercher les executables correspondants aux commandes.
	 * @var array
	 */
	protected $directories = array('/bin','/usr/bin');
	/**
	 * Les extensions des fichiers executables.
	 * @var array
	 */
	protected $extensions = array('js', 'php');

	/**
	 * Le terminal d'ou est lance la commande.
	 * @var Terminal
	 */
	protected $terminal;

	public function __construct(\lib\Webos $webos, \lib\Authorization $auth, $cmdText, Terminal $terminal) {
		$cmdText = trim($cmdText);
		$this->cmdText = $cmdText;
		$this->terminal = $terminal;

		$arrayCmd = explode(' ', $cmdText);
		$this->cmd = $arrayCmd[0];

		if (preg_match('#^".+"$#', $this->cmd)) {
			$this->cmd = preg_replace('#^"(.+)"$#', '$1', $this->cmd);
		}

		unset($arrayCmd[0]);
		$args = implode(' ', $arrayCmd);
		$this->arguments = new CmdArguments($webos);
		$this->arguments->setArguments($args);

		$path = null;

		if (preg_match('#^[\.~]?/#', $this->cmd)) {
			if ($webos->managers()->get('File')->exists($this->terminal->getAbsoluteLocation($this->cmd))) {
				$file = $webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation($this->cmd));
				if (!$file->isDir() && in_array($file->extension(), $this->extensions)) {
					$path = $file->path();
				}
			}
		}

		foreach ($this->directories as $dir) {
			$dirContents = $webos->managers()->get('File')->get($dir)->contents();
			foreach ($dirContents as $file) {
				if (!$file->isDir() && in_array($file->extension(), $this->extensions)) {
					if ($file->filename() == $this->cmd || $file->basename() == $this->cmd) {
						$path = $file;
					}
				}
			}
		}

		if (empty($path))
			throw new \InvalidArgumentException('"'.$this->cmd.'" : commande introuvable');

		//On appelle le constructeur du parent.
		parent::__construct($webos, $auth, $path);
	}

	public function run() {
		parent::run();

		$file = $this->webos->managers()->get('File')->get($this->path);
		switch ($file->extension()) {
			case 'js':
				$this->webos->getHTTPResponse()->setData(array(
					'pid' => $this->webos->getProcess()->getId(),
					'key' => $this->webos->getProcess()->getKey(),
					'authorizations' => $this->webos->getProcess()->getAuthorization()->get(),
					'path' => $this->getPath(),
					'cmd' => $this->cmd
				));
				break;
		}
	}
}