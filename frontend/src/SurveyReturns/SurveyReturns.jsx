import React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import "bootstrap/dist/css/bootstrap.min.css";

/**
 * Placeholder page for Survey Returns module.
 * No backend calls yet; just an empty state to avoid confusion.
 */
export default function SurveyReturns() {
  return (
    <div className="container mt-4">
      <h2 className="mb-3">Survey Returns</h2>

      <Card className="mb-3">
        <Card.Body>
          <Card.Title>Coming Soon</Card.Title>
          <Card.Text className="text-muted">
            This module will host incoming <strong>land survey returns</strong>
            (e.g., Survey Plan, Survey ID, coordinates, and related documents).
            For now, this is a placeholder so users see it as a separate section.
          </Card.Text>
          <div className="d-flex gap-2">
            <Button variant="secondary" disabled>
              Upload Survey Return (disabled)
            </Button>
            <Button variant="outline-secondary" disabled>
              View Samples (disabled)
            </Button>
          </div>
        </Card.Body>
      </Card>

      <p className="text-muted">
        Tip: If users need survey-related info today, they can still browse{" "}
        <strong>Land Parcels</strong> or <strong>Ibaan/Alameda</strong> records
        while this module is being prepared.
      </p>
    </div>
  );
}
