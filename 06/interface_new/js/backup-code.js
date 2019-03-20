    // function setNode(block, xml){
    //     block.nodes = new Array();
    //     block.links = new Array();
        
    //     // Setting simple nodes
    //     $(xml).children('stateSet').children('state').each(function(i, d){
    //         block.nodes.push(new SimpleNode(parseInt($(d).attr('sid')), 
    //                                         $(d).attr('final') === "true" ? true : false,
    //                                         parseFloat($(d).attr('posX')),
    //                                         parseFloat($(d).attr('posY')),
    //                                         $(d).attr('initial') === "true" ? true : false
    //                                         )
    //                         )
    //         lastNodeId = Math.max(lastNodeId, parseInt($(d).attr('sid')));
    //     })
    //     // Setting blocks recursively
    //     $(xml).children('stateSet').children('block').each(function(i, d){
    //         const subBlock = new BlockNode( parseInt($(d).attr('sid')),
    //                                         false,
    //                                         $(d).attr('regex'),
    //                                         parseFloat($(d).attr('posX')),
    //                                         parseFloat($(d).attr('posY'))
    //                                         )
    //         lastNodeId = Math.max(lastNodeId, subBlock.id);
    //         block.nodes.push(subBlock);
    //         let unique = true;
    //         blocksArr.forEach(d => {
    //             if(d.first.desc === subBlock.desc)
    //                 unique = false;
    //         })
    //         blocksArr.push(new Tuple(subBlock, unique));
    //         setNode(subBlock, $(d));
    //     })
    //     // Setting transitions
    //     $(xml).children('transitionSet').children('transition').each(function(i, d){
    //         const source = block.nodes.find(s => s.id === parseInt($(d).find('from').first().text()));
    //         const target = block.nodes.find(s => s.id === parseInt($(d).find('to').first().text()));
    //         const link = new Link(source, target, $(d).find('label').first().text(), false, source.id < target.id);
    //         link.selftransition = (source === target);
    //         block.links.push(link);
    //     })
    //     // Setting bidirectional
    //     block.links.forEach(dx => {
    //         block.links.forEach(dy => {
    //             if(dx.target === dy.source && dx.source === dy.target && dx !== dy){
    //                 dx.bidirectional = true;
    //                 dy.bidirectional = true;
    //             }
    //         })
    //     })
    // }

    this.setAutomaton = function(automaton){
        const xmlAut = $.parseXML(automaton);
        this.clear();
        // Getting alphabet
        $(xmlAut).find('alphabet').children().each(function(i, d){
            alphabet.push($(d).text());
        });
        // root.desc = $(xmlAut).find('block').first().attr('regex');
        // setNode(root, $(xmlAut).find('block').first());
        lastNodeId = root.set($(xmlAut).find('block').first());
        replaceContext(root);
        restart();
    }

override def renderCreate( createUnspecificProb : (String, String) => Problem,
                             returnFunc : () => Nothing ) : NodeSeq = {



      def create(formValues: String): JsCmd = {
        val formValuesXml = XML.loadString(formValues)
        val regEx = (formValuesXml \ "regexfield").head.text
        val alphabet = (formValuesXml \ "alphabetfield").head.text
        val shortDescription = (formValuesXml \ "shortdescfield").head.text

        //Keep only the chars
        val alphabetList = alphabet.split(" ").filter(_.length() > 0)
        val parsingErrors = GraderConnection.getRegexParsingErrors(regEx, alphabetList)

        if (parsingErrors.isEmpty) {

          val unspecificProblem = createUnspecificProb(shortDescription, "")

          val alphabetToSave = alphabetList.mkString(" ")
          val specificProblem: RegExToNFAProblem = RegExToNFAProblem.create
          specificProblem.problemId(unspecificProblem).regEx(regEx).alphabet(alphabetToSave)
          specificProblem.save

          return JsCmds.RedirectTo("/problems/index")

        } else {
          val errors = "<ul>" + parsingErrors.map("<li>" + _ + "</li>").mkString(" ") + "</ul>"
          val errorsXml = XML.loadString(errors)
          return JsCmds.JsShowId("submitbutton") & JsCmds.JsShowId("feedbackdisplay") & JsCmds.SetHtml("parsingerror", errorsXml)
        }
      }

      val alphabetField = SHtml.text("", value => {}, "id" -> "alphabetfield")
      val regExField = SHtml.text("", value => {}, "id" -> "regexfield")
      val shortDescriptionField = SHtml.textarea("", value => {}, "cols" -> "80", "rows" -> "5", "id" -> "shortdescfield")

      val hideSubmitButton: JsCmd = JsHideId("submitbutton")
      val alphabetFieldValXmlJs: String = "<alphabetfield>' + document.getElementById('alphabetfield').value + '</alphabetfield>"
      val regexFieldValXmlJs: String = "<regexfield>' + document.getElementById('regexfield').value + '</regexfield>"
      val shortdescFieldValXmlJs: String = "<shortdescfield>' + document.getElementById('shortdescfield').value + '</shortdescfield>"
      val ajaxCall: JsCmd = SHtml.ajaxCall(JsRaw("'<createattempt>" + alphabetFieldValXmlJs + regexFieldValXmlJs + shortdescFieldValXmlJs + "</createattempt>'"), create(_))

      val checkAlphabetAndSubmit: JsCmd = JsIf(Call("alphabetChecks", Call("parseAlphabetByFieldName", "alphabetfield")), hideSubmitButton & ajaxCall)

      val submitButton: NodeSeq = <button type='button' id='submitbutton' onclick={checkAlphabetAndSubmit}>Submit</button>

      val template: NodeSeq = Templates(List("regex-to-nfa-problem", "create")) openOr Text("Could not find template /regex-to-nfa-problem/create")
      Helpers.bind("createform", template,
        "alphabetfield" -> alphabetField,
        "regexfield" -> regExField,
        "shortdescription" -> shortDescriptionField,
        "submit" -> submitButton)
  }

  override def renderEdit : Box[(Problem, () => Nothing) => NodeSeq] = Full(renderEditFunc)

  private def renderEditFunc(problem : Problem, returnFunc : () => Nothing) : NodeSeq = {

    val regExToNFAProblem = RegExToNFAProblem.findByGeneralProblem(problem)


    var alphabet : String = regExToNFAProblem.getAlphabet
    var shortDescription : String = problem.getShortDescription
    var longDescription : String = problem.getLongDescription
    var regex : String = regExToNFAProblem.getRegex

    def edit(formValues : String) : JsCmd = {
      val formValuesXml = XML.loadString(formValues)
      val regEx = (formValuesXml \ "regexfield").head.text
      val alphabet = (formValuesXml \ "alphabetfield").head.text
      val shortDescription = (formValuesXml \ "shortdescfield").head.text

      //Keep only the chars
      val alphabetList = alphabet.split(" ").filter(_.length()>0);
      val parsingErrors = GraderConnection.getRegexParsingErrors(regEx, alphabetList)

      if(parsingErrors.isEmpty) {
          val alphabetToSave = alphabetList.mkString(" ")
          val specificProblem: RegExToNFAProblem = RegExToNFAProblem.create

          problem.setShortDescription(shortDescription).setLongDescription(longDescription).save()
          specificProblem.setAlphabet(alphabetToSave).setRegex(regEx).save()
          returnFunc()
        }
      else {
        val errors = "<ul>" + parsingErrors.map("<li>" + _ + "</li>").mkString(" ") + "</ul>"
        val errorsXml = XML.loadString(errors)
        return JsCmds.JsShowId("submitbutton") & JsCmds.JsShowId("feedbackdisplay") & JsCmds.SetHtml("parsingerror", errorsXml)
      }
    }

    // Remember to remove all newlines from the generated XML by using filter    
    val alphabetFieldValXmlJs : String = "<alphabetfield>' + document.getElementById('alphabetfield').value + '</alphabetfield>"
    val regexFieldValXmlJs : String = "<regexfield>' + document.getElementById('regexfield').value + '</regexfield>"
    val shortdescFieldValXmlJs : String = "<shortdescfield>' + document.getElementById('shortdescfield').value + '</shortdescfield>"

    val alphabetField = SHtml.text(alphabet, alphabet=_, "id" -> "alphabetfield")
    val regExField = SHtml.text(regex, regex=_, "id" -> "regexfield")
    val shortDescriptionField = SHtml.textarea(shortDescription, shortDescription = _, "cols" -> "80", "rows" -> "5", "id" -> "shortdescfield")

    val ajaxCall : JsCmd = SHtml.ajaxCall(JsRaw("'<createattempt>" + alphabetFieldValXmlJs + regexFieldValXmlJs + shortdescFieldValXmlJs + "</createattempt>'"), edit(_))
    val hideSubmitButton : JsCmd = JsHideId("submitbutton")
    val checkAlphabetAndSubmit : JsCmd = JsIf(Call("alphabetChecks",Call("parseAlphabetByFieldName", "alphabetfield")), hideSubmitButton & ajaxCall)

    val submitButton : NodeSeq = <button type='button' id='submitbutton' onclick={checkAlphabetAndSubmit}>Submit</button>

    val template : NodeSeq = Templates(List("regex-to-nfa-problem", "edit")) openOr Text("Could not find template /regex-to-nfa-problem/edit")
    Helpers.bind("editform", template,
      "alphabetfield" -> alphabetField,
      "regexfield" -> regExField,
      "shortdescription" -> shortDescriptionField,
      "submit" -> submitButton)
  }