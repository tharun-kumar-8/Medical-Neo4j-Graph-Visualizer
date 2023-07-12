const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');
const path = require('path');
const app = express();

// Create a Neo4j driver instance
const driver = neo4j.driver(
  'neo4j+s://9d311561.databases.neo4j.io:7687',
  neo4j.auth.basic('neo4j', 'LCdXIqG2T1Ajw5B0xr0YV27UhKxFefFXbPpt4GeaB_A') //can replace with your own neo4j credentials
);
app.use(cors()); 
app.use(express.static(path.join(__dirname, 'public')));
// Define a route to handle the request
app.get('/data', (req, res) => {
  // Define the Cypher query
  const cypherQuery = `
    MATCH (chiefComplaints:Section {name: "CHIEF COMPLAINTS"})
    OPTIONAL MATCH (chiefComplaints)-[:HAS_CHIEF_COMPLAINT]->(disorder:Disorder)
    OPTIONAL MATCH (disorder)-[:HAS_ANATOMY]->(anatomy:Anatomy)
    OPTIONAL MATCH (disorder)-[:HAS_LATERALITY]->(laterality:Laterality)
    OPTIONAL MATCH (disorder)-[level1:Level1]->(destNode)
    OPTIONAL MATCH (disorder)-[:HAS_OTHERS]->(others:Others)
    RETURN chiefComplaints, disorder, anatomy, laterality, level1, destNode, others
  `;
  const session = driver.session();
  session
    .run(cypherQuery)
    .then(result => {
      const transformed = {
        nodes: [],
        associations: [],
        level1: []
      };

      const records = result.records;
records.forEach(record => {
    const chiefComplaintsNode = record.get('chiefComplaints');
    if (chiefComplaintsNode) {
      const existingChiefComplaintsNode = transformed.nodes.find(
        node => node.node === chiefComplaintsNode.properties.name && node.type === 'Context: Section Title'
      );
      if (!existingChiefComplaintsNode) {
        transformed.nodes.push({
          node: chiefComplaintsNode.properties.name,
          type: 'Context: Section Title',
          attributesList: [],
          attributes: ['']
        });
      }
    }
  
    const disorderNode = record.get('disorder');
    if (disorderNode) {
      const disorderName = disorderNode.properties.name;
  
      const existingDisorderNode = transformed.nodes.find(
        node => node.node === disorderName && node.type === 'Disorders'
      );
      if (!existingDisorderNode) {
        const attributesList = [];
        const attributes = [];
  
        const anatomyNode = record.get('anatomy');
        if (anatomyNode) {
          attributesList.push({ type: anatomyNode.properties.type, value: anatomyNode.properties.name });
          attributes.push(anatomyNode.properties.name);
        }
  
        const lateralityNode = record.get('laterality');
        if (lateralityNode) {
          attributesList.push({ type: lateralityNode.properties.type, value: lateralityNode.properties.name });
          attributes.push(lateralityNode.properties.name);
        }
  
        const othersNode = record.get('others');
        if (othersNode) {
          attributesList.push({ type: othersNode.properties.type, value: othersNode.properties.name });
          attributes.push(othersNode.properties.name);
        }
  
        transformed.nodes.push({
          node: disorderName,
          type: 'Disorders',
          attributesList,
          attributes
        });
      }
    }
  });

      records.forEach(record => {
        const chiefComplaintsNode = record.get('chiefComplaints');
        const disorderNode = record.get('disorder');
        if (chiefComplaintsNode && disorderNode) {
          transformed.associations.push({
            sourceNode: chiefComplaintsNode.properties.name,
            destinationNode: disorderNode.properties.name,
            edge: '',
            attributesList: [],
            attributes: ['']
          });
        }

        const disorderName = disorderNode ? disorderNode.properties.name : null;
        const anatomyNode = record.get('anatomy');
        if (disorderName && anatomyNode) {
          transformed.associations.push({
            sourceNode: disorderName,
            destinationNode: anatomyNode.properties.name,
            edge: '',
            attributesList: [],
            attributes: ['']
          });
        }

        const lateralityNode = record.get('laterality');
        if (disorderName && lateralityNode) {
          transformed.associations.push({
            sourceNode: disorderName,
            destinationNode: lateralityNode.properties.name,
            edge: '',
            attributesList: [],
            attributes: ['']
          });
        }

        const level1Node = record.get('level1');
        const destNode = record.get('destNode');
        if (disorderName && level1Node && destNode) {
          transformed.level1.push({
            sourceNode: disorderName,
            destNode: destNode.properties.name,
            linkName: '',
            concept: `${level1Node.properties.code} - ${level1Node.properties.name}`,
            confidenceScore: level1Node.properties.confidenceScore
          });
        }
      });

      res.json(transformed);
    })
    .catch(error => {
      console.error('Error executing Cypher query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
    })
    .finally(() => {
      session.close();
    });
});

// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
  console.log('http://localhost:3000')
});
