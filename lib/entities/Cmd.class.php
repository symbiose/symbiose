<?php
namespace lib\entities;

/**
 * A command.
 * @author $imon
 */
class Cmd extends Process {
	/**
	 * The raw command.
	 * @var string
	 */
	protected $cmd = '';
	/**
	 * The executable name.
	 * @var string
	 */
	protected $executable = '';
	/**
	 * Options.
	 * @var array
	 */
	protected $options = array();
	/**
	 * Parameters.
	 * @var array
	 */
	protected $params = array();

	//SETTERS

	public function setCmd($cmd) {
		if (!is_string($cmd)) {
			throw new \InvalidArgumentException('Invalid command "'.$cmd.'"');
		}

		$this->cmd = $cmd;

		$array = str_split($cmd); //On decompose la commande en caracteres
		$cacheBase = array(
			'str_started' => false,
			'str_type' => null,
			'str_index' => null,
			'str_content' => null,
			'previous' => null,
			'str_option_type' => null,
			'str_stage' => 'index'
		); //On initialise le cache
		$cache = $cacheBase;

		$executableFound = false;

		foreach ($array as $char) { //Pour chaque caractere $char
			if ($char == '"') { //Delimiteur de chaine
				if ($cache['previous'] == '\\') { //Si on a echappe le delimiteur
					if ($cache['str_stage'] == 'content') { //Si on remplit le contenu
						$cache['str_content'] = substr($cache['str_content'], 0, -1); //On enleve le \
						$cache['str_content'] .= $char; //On ajoute le "
					} else { //Sinon on remplit l'index
						$cache['str_index'] = substr($cache['str_index'], 0, -1); //on enleve le \
						$cache['str_index'] .= $char; //On ajoute le "
					}
				} else {
					if ($cache['str_started'] == false) { //Si c'est le premier
						$cache['str_started'] = true; //On le sauvegarde
					} else { //Sinon, fin de chaine
						$cache['str_started'] = false;
					}
				}
			} elseif ($char == ' ' && $cache['str_started'] != true) { //Si c'est un espace et qu'on n'est pas dans une chaine
				if ($cache['str_type'] == 'options') { //Si c'est une option
					$this->options[$cache['str_index']] = $cache['str_content']; //On sauvegarde
				} else { //Sinon, c'est un argument
					if (!$executableFound) { //Premier argument = nom de l'executable
						$this->executable = $cache['str_index']; //On sauvegarde
						$executableFound = true;
					} else {
						$this->params[] = $cache['str_index']; //On sauvegarde
					}
				}
				$cache = $cacheBase; //On remet le cache a zero
			} elseif ($char == '-') { //Si c'est un tiret
				if ($cache['previous'] == '-') { //Si le caractere precedant etait aussi un tiret, c'est une option type --fruit=abricot
					$cache['str_option_type'] = 'long'; //Type de l'option
				} elseif ($cache['previous'] == ' ' || $cache['previous'] === null) { //Si c'etait un espace blanc, c'est une option type -aBv
					$cache['str_type'] = 'options'; //C'est une option
					$cache['str_option_type'] = 'short'; //Type de l'option
					$cache['str_stage'] = 'index'; //On remplit l'index
				} else { //Sinon, ce n'est pas une option (e.g. fruit-de-mer)
					if ($cache['str_stage'] == 'content') { //Si on remplit le contenu
						$cache['str_content'] .= $char; //On ajoute le -
					} else { //Sinon, on remplit l'index
						$cache['str_index'] .= $char; //On ajoute le -
					}
				}
			} elseif ($char == '=') { //Si c'est un =
				if ($cache['str_type'] == 'options' && $cache['str_option_type'] == 'long') { //Si c'est une option type --fruit=abricot
					$cache['str_stage'] = 'content'; //On remplit maintenant le contenu
				}
			} else { //Autre caractere
				if ($cache['str_stage'] == 'content') { //Si on remplit le contenu
					$cache['str_content'] .= $char; //On ajoute le caractere
				} else { //Sinon on remplit l'index
					if ($cache['str_type'] == 'options') { //Si c'est une option
						if ($cache['str_option_type'] == 'long') { //Si c'est une option type --fruit=abricot
							$cache['str_index'] .= $char; //On remplit l'index
						} else { //Sinon, c'est une option type -aBv
							$this->options[$char] = null; //On ajoute l'option
							//On definit les parametres au cas ou il y a une autre option apres
							$cache = $cacheBase; //On reinitialise le cache
							$cache['str_type'] = 'options'; //C'est une option
							$cache['str_option_type'] = 'short'; //C'est une option type -aBv
							$cache['str_stage'] = 'index'; //On remplit l'index
						}
					} else { //Sinon c'est un argument
						$cache['str_index'] .= $char; //On ajoute le caractere
					}
				}
			}
			$cache['previous'] = $char; //On definit le caractere precedant
		}

		//On vide le cache du dernier caractere
		if ($cache['str_index'] !== null) {
			if ($cache['str_type'] == 'options') { //Option
				$this->options[$cache['str_index']] = $cache['str_content'];
			} else { //Argument
				if (!$executableFound) { //Premier argument = nom de l'executable
					$this->executable = $cache['str_index']; //On sauvegarde
					$executableFound = true;
				} else {
					$this->params[] = $cache['str_index']; //On sauvegarde
				}
			}
		}
	}

	// GETTERS

	public function cmd() {
		return $this->cmd;
	}

	public function executable() {
		return $this->executable;
	}

	public function options() {
		return $this->options;
	}

	public function params() {
		return $this->params;
	}
}