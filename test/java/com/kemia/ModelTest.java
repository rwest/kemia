package com.kemia; 
import com.thoughtworks.selenium.SeleneseTestCase; 
public class ModelTest extends SeleneseTestCase { 
    private final String DIRECTORY_PREFIX = "file:////Users/paulnovak/wingu/workspace/kemia/";
  
  public void setUp() throws Exception { 
    final String url = DIRECTORY_PREFIX; 
//    final String browserString = "*firefox"; 
    final String browserString = "*chrome"; 
//    final String browserString = "*safari"; 
    setUp(url, browserString); 
  } 
  public void testModel() throws Exception { 
//    selenium.open(DIRECTORY_PREFIX + "kemia/model/model_test.html");
	    selenium.open(DIRECTORY_PREFIX + "kemia/model/neighborlist_test.html");  
    selenium.waitForCondition( 
        "window.G_testRunner && window.G_testRunner.isFinished()", 
        "5000"); 
    String success = selenium.getEval("window.G_testRunner.isSuccess()"); 
    boolean isSuccess = "true".equals(success); 
    if (!isSuccess) { 
      String report = selenium.getEval("window.G_testRunner.getReport()"); 
      fail(report); 
    } 
  } 
} 
